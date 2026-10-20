import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real modules with isolated Next request and database dependencies.
function load(file, dependencies, env = {}) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, process: { env }, TextEncoder,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

const secret = 'test-secret-with-at-least-32-characters';
async function fixture({ token, user = { id: 'u1', role: 'ADMIN' }, databaseError, env = { JWT_SECRET: secret } } = {}) {
  const jose = await import('jose');
  let reads = 0;
  const auth = load('src/lib/auth.ts', {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    'next/navigation': { redirect: (url) => { throw new Error(`REDIRECT:${url}`); } },
    jose,
    '@prisma/client': { UserRole: { ADMIN: 'ADMIN', TEACHER: 'TEACHER', ESSAY_CORRECTOR: 'ESSAY_CORRECTOR' } },
    '@/lib/prisma': { prisma: { user: { findUnique: async () => {
      reads++;
      if (databaseError) throw databaseError;
      return user;
    } } } },
  }, env);
  return { auth, reads: () => reads };
}

async function sign(payload = { userId: 'u1' }, expiration = '1h', signingSecret = secret) {
  const { SignJWT } = await import('jose');
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiration).sign(new TextEncoder().encode(signingSecret));
}

test('missing, malformed, expired and forged sessions never query the database', async () => {
  for (const token of [undefined, 'invalid', await sign(undefined, '0s'), await sign(undefined, '1h', 'different-secret-with-at-least-32-characters'), await sign({ userId: 123 })]) {
    const f = await fixture({ token });
    assert.equal(await f.auth.getCurrentUser(), null);
    assert.equal(f.reads(), 0);
  }
});

test('valid session retrieves the user; a deleted user is unauthenticated', async () => {
  const token = await sign();
  const f = await fixture({ token });
  assert.equal((await f.auth.getCurrentUser()).id, 'u1');
  assert.equal(f.reads(), 1);
  const deleted = await fixture({ token, user: null });
  assert.equal(await deleted.auth.getCurrentUser(), null);
});

test('database and configuration failures propagate instead of redirecting to login', async () => {
  const token = await sign();
  const error = new Error('database unavailable');
  const f = await fixture({ token, databaseError: error });
  await assert.rejects(f.auth.requireUser(), (actual) => actual === error);
  const misconfigured = await fixture({ token, env: {} });
  await assert.rejects(misconfigured.auth.requireUser(), /JWT_SECRET/);
  assert.equal(misconfigured.reads(), 0);
});

for (const [file, action, model, values] of [
  ['alunos', 'createStudent', 'student', { name: 'Aluno', classRoomId: 'c1', number: '1' }],
  ['turmas', 'createClassRoom', 'classRoom', { name: 'A', grade: '1' }],
  ['simulados', 'createExam', 'exam', { title: 'Simulado', grade: '1', totalQuestions: '10' }],
]) {
  test(`${action}: rejects invalid input without writing or invalidating pages`, async () => {
    let writes = 0;
    let invalidations = 0;
    const actions = load(`src/app/${file}/actions.ts`, {
      '@/lib/auth': { requireAcademicAccess: async () => ({ role: 'ADMIN' }) },
      '@/lib/prisma': { prisma: { [model]: { create: async () => { writes++; } } } },
      'next/cache': { revalidatePath: () => { invalidations++; } },
    });
    const invalid = file === 'alunos'
      ? [{ name: '   ' }, { classRoomId: ' ' }, ...['-1', '1.5', 'NaN', 'Infinity', '2147483648'].map(number => ({ number }))]
      : [
          { [file === 'turmas' ? 'name' : 'title']: '   ' },
          ...['0', '-1', '4', '1.5', 'Infinity', 'abc'].map(grade => ({ grade })),
          ...(file === 'simulados' ? ['0', '-1', '1.5', 'NaN', 'Infinity', '2147483648'].map(totalQuestions => ({ totalQuestions })) : []),
        ];
    for (const overrides of invalid) {
      const form = new FormData();
      for (const [key, value] of Object.entries({ ...values, ...overrides })) form.set(key, value);
      await assert.rejects(actions[action](form));
    }
    for (const key of Object.keys(values)) {
      const form = new FormData();
      for (const [field, value] of Object.entries(values)) form.set(field, value);
      form.set(key, new Blob(['unexpected file']), 'input.txt');
      await assert.rejects(actions[action](form));
    }
    assert.equal(writes, 0);
    assert.equal(invalidations, 0);
  });

  test(`${action}: normalizes text and accepts valid boundary values`, async () => {
    let saved;
    const actions = load(`src/app/${file}/actions.ts`, {
      '@/lib/auth': { requireAcademicAccess: async () => ({ role: 'ADMIN' }) },
      '@/lib/prisma': { prisma: { [model]: { create: async ({ data }) => { saved = data; } } } },
      'next/cache': { revalidatePath: () => {} },
    });
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) form.set(key, ` ${value} `);
    if (file === 'alunos') form.set('number', '0');
    await actions[action](form);
    assert.equal(saved[file === 'simulados' ? 'title' : 'name'], values[file === 'simulados' ? 'title' : 'name']);
    if (file === 'alunos') {
      assert.equal(saved.number, 0);
      form.delete('number');
      await actions[action](form);
      assert.equal(saved.number, null);
    }
  });

  test(`${action}: only ADMIN and TEACHER can write; anonymous and corrector cannot`, async () => {
    for (const role of [null, 'ESSAY_CORRECTOR', 'ADMIN', 'TEACHER']) {
      const f = await fixture({ token: role ? await sign() : undefined, user: { id: 'u1', role } });
      let writes = 0;
      let invalidations = 0;
      const actions = load(`src/app/${file}/actions.ts`, {
        '@/lib/auth': f.auth,
        '@/lib/prisma': { prisma: { [model]: { create: async () => { writes++; } } } },
        'next/cache': { revalidatePath: () => { invalidations++; } },
      });
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) form.set(key, value);
      if (role === 'ADMIN' || role === 'TEACHER') {
        await actions[action](form);
        assert.equal(writes, 1);
        assert.equal(invalidations, 1);
      } else {
        await assert.rejects(actions[action](form), /REDIRECT:/);
        assert.equal(writes, 0);
        assert.equal(invalidations, 0);
      }
    }
  });
}
