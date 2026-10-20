# Alterações e publicação

O código deste repositório é a fonte das alterações. Faça e teste as mudanças
localmente antes de publicar; evite editar apenas a cópia do servidor.

## Validar localmente

```bash
npm ci
npx prisma generate
npm run test:auth
npx tsc --noEmit
npm run build
```

Revise o diff e registre as alterações em um commit antes de transferi-las.
Não versione `.env`, senhas ou chaves. Configure o ambiente do servidor separadamente.

Para conferir a interface localmente, execute `npm run dev` e entre com um perfil
de administrador ou professor. Em Alunos, confira a navegação entre páginas e se
pesquisa, ano e turma são mantidos. Ao trocar os filtros, a listagem começa na
primeira página. Cada página mostra até 25 alunos.

Nos cadastros de alunos, turmas e simulados, confira as mensagens junto aos
campos, a indicação de salvamento e a confirmação de sucesso. Uma turma com nome
repetido deve mostrar um aviso sem apagar os dados preenchidos. Os campos só são
limpos após o cadastro ser confirmado. Use dados de teste para essas verificações.

## Publicar no servidor interno

Atualize o checkout do servidor para o commit validado, preservando o `.env`
e a pasta `storage`, que contém os arquivos enviados pelos usuários.

```bash
cd /home/suporte928/senai-performance
npm ci
npx prisma generate
npm run test:auth
npm run build
pm2 restart senai-performance --update-env
pm2 save
curl -I http://127.0.0.1:3000/login
```

Não execute `npm run dev` na mesma porta da aplicação do PM2.
Quando houver alterações no schema, revise e aplique as migrations com backup
do banco antes de iniciar o código que depende delas.

No acesso interno atual por HTTP, configure `AUTH_COOKIE_SECURE=false` no `.env`.
Em HTTPS, use `AUTH_COOKIE_SECURE=true`.

Após publicar, valide login, navegação e cadastros com os perfis adequados.
HTTP 200 na página de login não comprova que a sessão funciona no navegador.
