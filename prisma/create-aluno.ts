import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GRUPOS_ALUNOS = [
    {
        classRoomName: "IDEV-3",
        grade: 3,
        students: [
            "ANA CLARA BATISTA MININ",
            "ARTHUR MARQUES SILVA NASCIMENTO",
            "ARTHUR PASSI DEZAN",
            "BEATRIZ GARRIDO RODRIGUES SIRIANI",
            "BRIAN SHINHAMA BELO DA SILVA",
            "CARLOS EDUARDO MARTINS DOS SANTOS",
            "EMANUEL HENRIQUE SILVA PEREIRA",
            "FELIPE ANDRADE OLIVEIRA",
            "FELIPE NERCELSO DE SOUZA SANTOS",
            "ISABELA NEVES LONGHI",
            "JOÃO PEDRO ALVES RODRIGUES",
            "JULIA CARVALHO WADA",
            "JULIA CHECCHIO DE LIMA",
            "LEONARDO MARCONI MARCHETI",
            "LÍVIA SAYURI SHIRO TARGINO",
            "LOHANNY PEREIRA MIRANDA",
            "LUCAS GREGORIO SANTOS",
            "LUIZ MIGUEL BARBOSA DE SOUZA BOAS",
            "MANUELA SOTRATE",
            "MARIA EDUARDA DE ARAUJO FERNEDA",
            "MARIA EDUARDA SANTOS OLIVEIRA",
            "MARIANA FERREIRA GOMES",
            "MIGUEL DOS SANTOS PEREIRA",
            "MIGUEL RUBENS DE SOUZA",
            "NÍCOLAS FREITAS DE SOUZA",
            "OTÁVIO RODRIGUES SEIDINGER",
            "OTAVIO YUUKI KASHIMA",
            "RAFAEL CEOLIN VIEIRA",
            "RAFAEL SANCHES PERACINE",
            "SOFIA MORILHA DANTAS",
            "THALISSON DOUGLAS PEREIRA DE LIMA",
            "THIAGO AUGUSTO DE PAULA SILVA"
        ]
    },
    {
        classRoomName: "IDEV-4",
        grade: 2,
        students: [
            "ALÍCIA LURI YUASA",
            "ANA CAROLINE RODRIGUES ROMBI",
            "ARTHUR BALDO TEDESCO",
            "CAIO CÉSAR DUTRA ZANCHETIN",
            "CAUÃ MENDES DELARCO",
            "DAVID SILVA TELLES DA CRUZ",
            "DIEGO MOURA DOS SANTOS",
            "EMILLY GABRIELLY DE SOUZA GONÇALVES",
            "ENZO MASSAHARU KURAMOTO",
            "ERICK VINICIUS ROCHA BENTO",
            "GABRIEL AUGUSTO FURLANETO DAS NEVES",
            "GABRIEL DOS SANTOS MOREIRA",
            "HUGO DE FREITAS MARQUES GARCIA",
            "ISABELA SCALHON LIMA",
            "ISAQUE FORCEMO MUNERATO DE OLIVEIRA",
            "JOÃO GUILHERME",
            "JOÃO GUSTAVO PEREIRA",
            "JOAO VICTOR RAMOS COELHO",
            "JÚLIA VIEIRA DE SOUZA",
            "KAUANNY FERNANDA DA SILVA SANTOS",
            "LARISSA NERES CAMPANARI",
            "LAVÍNIA EMANUELLE GAMA DE SOUZA",
            "LUIS GUSTAVO REIS TAVARES DE LIRA",
            "MALLCON EDUARDO LIGEIRO FERREIRO",
            "MIGUEL GARCIA DA HORA",
            "MIRELA APARECIDA CRUZ DE CAMPOS COSTA",
            "MURILO DOS SANTOS ARAUJO",
            "RAFAELA SANTANA CORTINOVIS",
            "RENATA APARECIDA DE QUEIROZ PEREIRA",
            "RYAN MATHEUS SOARES DE ARAUJO",
            "SARAH PEREIRA SARAIVA"
        ]
    },
    {
        classRoomName: "IDEV-5",
        grade: 1,
        students: [
            "ANA CLARA GOMIDES DE OLIVEIRA",
            "ARTHUR HENRIQUE MATSUNOBU GIROTO",
            "DANIEL JANUÁRIO TONINI",
            "DAVI MORE NAPOLEONE",
            "FELIPE SILVEIRA",
            "FILIPE DA CUNHA GONÇALVES SILVA",
            "FLAVIA FANTIN MENDES",
            "GIOVANNA LONGHI SILVA",
            "GUSTAVO CARDOSO DE SOUSA",
            "GUSTAVO SAVERIO GOMES",
            "ISABELLA CRISTINA LIMA DA SILVA",
            "JULIA CARDOSO GONCALVES",
            "LAUANY KETLIN MACARIO DA SILVA",
            "LAVÍNIA DE FREITAS AMÉRICO",
            "LIVIA MARIA GERES RODRIGUES",
            "LUCAS ROSSINI CARDOSO",
            "LUIS GUSTAVO YOSHIMURA ALONGE",
            "MARIA CLARA SANTOS OLIVEIRA",
            "MARIA EDUARDA HONORATO FAUSTINO",
            "MARIA FERNANDA NAGAO",
            "MARIA FERNANDA PACOLA BERNAVADA SILVA",
            "MARIA JÚLIA SAMPAIO RIBEIRO",
            "MIGUEL ELIAS DE SOUZA",
            "MIGUEL LEANDRO JULIANI",
            "OTAVIO CAETANO FERREIRA",
            "PEDRO VICENTE AGUIAR",
            "RAFAEL DE OLIVEIRA BOMFIM",
            "RAFAELLA PEREIRA SOARES DE OLIVEIRA",
            "SAMUEL MATHEUS FURLAN RODRIGUES",
            "THEO DE FARIA PERIGO",
            "VITOR LUCIANO DOS SANTOS SILVA",
            "WELLINGTON TSUYOSHI SASSAKI"
        ]
    },
    {
        classRoomName: "IELEMEC-3",
        grade: 3,
        students: [
            "ANA JÚLIA DA SILVA SANTOS",
            "ANA LAURA AMORIM PEREIRA",
            "ANA LUISA COSTA CALLIGARIS",
            "ANNA JULIA DOS SANTOS FEITOSA",
            "ANTHONY MAY DA SILVA",
            "BEATRIZ COSTA PONCIANO",
            "BEATRIZ PEDROSA NUNES",
            "BRENO DOS SANTOS CERCONVIS",
            "CARLOS HENRIQUE DE SOUZA PEREIRA",
            "DIOGO SANTOS PESSOA",
            "EMANUEL DE BARROS PIRES",
            "EMY SHIOZAWA",
            "ENZO FRANCISCO DOS SANTOS SILVA",
            "ENZO MIGUEL BATISTA DOS SANTOS SOUZA",
            "GIOVANNA AMARAL SCHENFELD",
            "GUILHERME MASSOCA CORREIA REIS",
            "GUSTAVO BRITO",
            "GUSTAVO REZENDE DA SILVA",
            "IGOR DE SOUZA LEITE",
            "JHENYFER ISABELLY LEBLON SILVA",
            "KAUÃ RENAN BONFIM LOPES",
            "LEONARDO RODRIGUES LUZ",
            "LUCAS ANGENENDT BRITO",
            "LUCAS SILVA SOUZA",
            "MARIA GABRIELLA CAMARGO SANTOS",
            "MARIA PAULA DE MORAIS FELIX",
            "MATHEUS MIGUEL GONÇALVES DOS SANTOS",
            "MATHEUS VIDAL RISSATTO",
            "NICOLLY APARECIDA DOS SANTOS SILVA",
            "NILSON RICARDO KUPLENS KASBAR",
            "PEDRO KIMURA SILVA",
            "PEDRO TORRES GARCIA"
        ]
    },
    {
        classRoomName: "IELEMEC-4",
        grade: 2,
        students: [
            "ASAFE LEANDRO DOS SANTOS",
            "BENJAMIN MARTINEZ TSEN",
            "BERNARDO UEJI HASSEGAWA",
            "ENZO GABRIEL CARVALHO DA SILVA",
            "ERICK RODRIGUES DO CARMO",
            "GABRIEL PISSIN FELIX DE ALMEIDA",
            "GABRIELA BASILIO ROSA",
            "GIOVANNE ROCHA DE OLIVEIRA",
            "ISAAC FELIPE XAVIER MILAN",
            "JOÃO AUGUSTO MASSEIS DE OLIVEIRA",
            "KEVIN DA SILVA CRUZ",
            "LARISSA PONCIANO AVELAR",
            "LAURA LIMA DE ANDRADE",
            "LIVIA MARIA YAZAWA GOLFETO",
            "LOHANA FOGAGNOLI PEREIRA",
            "LUCA DE OLIVEIRA GUIDONI",
            "LUCAS ICHIRO HONDA",
            "LUIZ RENATO DE OLIVEIRA SILVA",
            "MARIANNE GASPAR DE OLIVEIRA JESUS",
            "MURILO HENRIQUE DA SILVA SATURNINO",
            "NICOLAS FREITAS SABINO",
            "NICOLAS TAVARES DA SILVA",
            "PEDRO AMORIM LEBRON DE LIMA",
            "PEDRO AUGUSTO DA SILVA OLIVEIRA",
            "PEDRO OTÁVIO ROMANO QUINQUIO",
            "RAPHAEL APARECIDO GALHARDO",
            "RAYANE MARTINS GALDINO",
            "THIAGO OLIVEIRA SANTOS",
            "VINICIUS ANDRÉ SAMPAIO",
            "VITOR ALVES BERNARDO",
            "VITOR HUGO DE SOUZA GUIMARÃES",
            "YASMIM DOS SANTOS GUIARÃES"
        ]
    },
    {
        classRoomName: "IELEMEC-5",
        grade: 1,
        students: [
            "ANA LAURA GOMES BRANDÃO",
            "ANA LAURA PEREIRA E SILVA",
            "ARYANE LIMA OLIVEIRA",
            "CAUÃ MIGUEL DOS SANTOS RAMOS",
            "ELIÉZER CORDEIRO DE CARVALHO",
            "EMANUELLY BIANCA DE OLIVEIRA GARCIA",
            "EMILY CRISTINE DIAS DOS SANTOS",
            "ENZO DOS SANTOS GUIMARAES",
            "ENZO GUSMAN CEZARIO",
            "ERIC HENRIQUE ESTÁCIO DA SILVA",
            "FILIPE GABRIEL DE OLIVEIRA",
            "GABRIEL LIMA DA SILVA BARROS",
            "GABRIELLY MARTINS VIDOI",
            "GIOVANNA NUNES BORRASCA",
            "GUILHERME SANTOS RAMOS",
            "HENRI GABRIEL FREDDI FURLAN",
            "IGOR VASCONCELOS KRESKI",
            "JÉSSICA SAMARA CASSARO DA CRUZ",
            "KEMILLY VITÓRIA PATURI LUIZ",
            "LOUISE VICTORIA MAY DOS SANTOS",
            "LUCAS DAMACENA ESPOSITO",
            "LUIS PAULO AMARAL QUERINO",
            "MARCO ANTÔNIO FERREIRA MANTUANELLI",
            "MARCO VICENTE GODOI SIQUEIRA",
            "MATHEUS ANTÔNIO CAMPOS SOTO",
            "MIGUEL ALCÂNTARA GAZETA",
            "MIGUEL NUNES HADDAD",
            "NATHAN DE ALMEIDA SILVA",
            "SAULO GABRIEL MENDES DOS SANTOS",
            "SÁVIO CAVALCANTE SILVA",
            "VITORIA ADAMI RAMOS",
            "YASMIM DA SILVA DOS SANTOS"
        ]
    }
];

async function main() {
    console.log("Iniciando a inserção e atualização de alunos...");

    for (const grupo of GRUPOS_ALUNOS) {
        console.log(`\n--------------------------------------------`);
        console.log(`Processando turma: ${grupo.classRoomName} (Ano: ${grupo.grade})`);
        console.log(`--------------------------------------------`);

        // 1. Buscar ou criar a turma correspondente
        let classRoom = await prisma.classRoom.findUnique({
            where: { name: grupo.classRoomName }
        });

        if (!classRoom) {
            console.log(`Turma ${grupo.classRoomName} não encontrada. Criando...`);
            classRoom = await prisma.classRoom.create({
                data: {
                    name: grupo.classRoomName,
                    grade: grupo.grade
                }
            });
        }

        console.log(`Turma ${grupo.classRoomName} pronta com ID: ${classRoom.id}`);

        // 2. Inserir/Atualizar cada aluno com seu número de chamada sequencial
        let criados = 0;
        let atualizados = 0;

        for (let i = 0; i < grupo.students.length; i++) {
            const nome = grupo.students[i];
            const numeroChamada = i + 1;

            // Verificar se o aluno já existe na turma
            const alunoExistente = await prisma.student.findFirst({
                where: {
                    name: nome,
                    classRoomId: classRoom.id
                }
            });

            if (alunoExistente) {
                // Atualiza o número de chamada se necessário
                await prisma.student.update({
                    where: { id: alunoExistente.id },
                    data: { number: numeroChamada }
                });
                atualizados++;
            } else {
                // Cria o aluno
                await prisma.student.create({
                    data: {
                        name: nome,
                        number: numeroChamada,
                        classRoomId: classRoom.id
                    }
                });
                criados++;
            }
        }

        console.log(`Resultados para ${grupo.classRoomName}:`);
        console.log(`- Alunos criados: ${criados}`);
        console.log(`- Alunos atualizados: ${atualizados}`);
    }

    console.log(`\n============================================`);
    console.log("Todo o processo foi concluído com sucesso!");
    console.log(`============================================`);
}

main()
    .catch((error) => {
        console.error("Erro ao executar script:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
