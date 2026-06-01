# SENAI Performance

Sistema interno de análise de desempenho acadêmico do SENAI — plataforma para gerenciamento de turmas, alunos, simulados, redações e módulo de leitura.

---

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Banco de dados**: MySQL
- **ORM**: Prisma 6
- **Autenticação**: JWT com cookies HTTP-only
- **Estilização**: Tailwind CSS v4
- **IA**: Groq SDK

---

## Pré-requisitos

- Node.js >= 20
- MySQL >= 8 em execução
- Git

---

## 1. Clonar o repositório

```bash
git clone https://github.com/arthurmarquesn/senai-performance.git
cd senai-performance
```

---

## 2. Instalar dependências

```bash
npm install
```

---

## 3. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto com base no `.env.exemple`:

```env
# Conexão com o banco de dados MySQL
# Use localhost ou 127.0.0.1 quando o banco estiver na mesma máquina
DATABASE_URL="mysql://usuario:senha@localhost:3306/senai_performance"

# Segredo para geração dos tokens JWT
JWT_SECRET="alfred_secret"

# Chave de API da Groq (para o módulo de IA)
GROQ_API_KEY="sua_chave_aqui"
```

> **Atenção:** Nunca use `0.0.0.0` na `DATABASE_URL`. Esse IP é usado para o banco *escutar* conexões, não para o cliente se *conectar*. Use sempre `localhost` ou `127.0.0.1`.

---

## 4. Criar banco de dados e aplicar migrações

O Prisma cria o banco `senai_performance` automaticamente na primeira execução, caso ele não exista.

```bash
# Cria o banco, aplica todas as migrações e executa o seed padrão (turmas)
npx prisma migrate dev
```

> Em servidores de **produção**, use `migrate deploy` em vez de `migrate dev`:
> ```bash
> npx prisma migrate deploy
> ```

---

## 5. Criar usuários do sistema

Os usuários do sistema (professores e administradores) são criados via script:

```bash
npx tsx prisma/create-user.ts
```

**Senha padrão de todos os usuários:** `senai928`

---

## 6. Popular alunos e turmas

Para criar as 6 turmas e seus 191 alunos no banco de dados:

```bash
npx tsx prisma/create-aluno.ts
```

O script é idempotente — pode ser executado múltiplas vezes sem duplicar registros. Ele criará ou atualizará automaticamente:

| Turma | Ano | Alunos |
|-------|-----|--------|
| IDEV-3 | 3º ano | 32 |
| IDEV-4 | 2º ano | 31 |
| IDEV-5 | 1º ano | 32 |
| IELEMEC-3 | 3º ano | 32 |
| IELEMEC-4 | 2º ano | 32 |
| IELEMEC-5 | 1º ano | 32 |

---

## 7. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 8. Build de produção

```bash
npm run build
npm run start
```

---

## Deploy em Servidor Linux

### Pré-requisitos no servidor
- Node.js >= 20
- MySQL habilitado para iniciar no boot:
  ```bash
  sudo systemctl enable mysql
  sudo systemctl start mysql
  ```

### Setup inicial no servidor (via SSH)

```bash
# 1. Clonar o repositório
git clone https://github.com/arthurmarquesn/senai-performance.git
cd senai-performance

# 2. Instalar dependências
npm install

# 3. Criar e configurar o .env (ver seção 3 acima)
nano .env

# 4. Aplicar migrações em produção
npx prisma migrate deploy

# 5. Gerar Prisma Client
npx prisma generate

# 6. Criar usuários do sistema
npx tsx prisma/create-user.ts

# 7. Criar turmas e alunos
npx tsx prisma/create-aluno.ts

# 8. Gerar build de produção
npm run build
```

### Manter a aplicação ativa com PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar a aplicação
pm2 start npm --name "senai-performance" -- start

# Gerar script de inicialização no boot do servidor
pm2 startup
# (copie e execute o comando gerado pelo terminal)

# Salvar a lista de processos ativos
pm2 save
```

Comandos úteis do PM2:

```bash
pm2 status                        # Ver status dos processos
pm2 logs senai-performance        # Ver logs em tempo real
pm2 restart senai-performance     # Reiniciar a aplicação
pm2 stop senai-performance        # Parar a aplicação
```

### Atualizar código no servidor

Sempre que houver uma nova versão, execute no servidor:

```bash
git pull
npm install
npx prisma migrate deploy
npm run build
pm2 restart senai-performance
```

---

## Estrutura de Scripts Prisma

| Comando | Descrição |
|---------|-----------|
| `npx prisma migrate dev` | Aplica migrações e roda seed (desenvolvimento) |
| `npx prisma migrate deploy` | Aplica migrações sem seed (produção) |
| `npx prisma generate` | Regenera o Prisma Client |
| `npx tsx prisma/create-user.ts` | Cria os usuários do sistema |
| `npx tsx prisma/create-aluno.ts` | Cria/atualiza turmas e alunos |
| `npx tsx prisma/seed-books.ts` | Popula o catálogo de livros |

---

## Notas sobre ambiente

- O cookie de sessão usa `secure: false` para permitir o acesso via HTTP em servidores de desenvolvimento sem HTTPS. Em produção com HTTPS configurado, altere para `secure: true` no arquivo `src/lib/auth.ts`.
- O middleware de autenticação (`src/proxy.ts`) valida o cookie `alfred_token` em todas as rotas protegidas.
- Em servidores Linux, o MySQL é **case-sensitive** para nomes de tabelas. Certifique-se de que os arquivos de migração usam a capitalização correta (`Exam`, não `exam`).
