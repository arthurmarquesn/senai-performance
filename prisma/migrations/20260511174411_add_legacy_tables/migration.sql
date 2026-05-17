-- CreateTable
CREATE TABLE `alunos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `tecnico` VARCHAR(100) NOT NULL,
    `serie` CHAR(14) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `simulados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jornada` VARCHAR(100) NOT NULL,
    `numero_prova` INTEGER NOT NULL,
    `serie` VARCHAR(45) NOT NULL,

    UNIQUE INDEX `unique_simulado`(`jornada`, `numero_prova`, `serie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `redacoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aluno_id` INTEGER NOT NULL,
    `simulado_id` INTEGER NULL,
    `competencia1` INTEGER NULL DEFAULT 0,
    `competencia2` INTEGER NULL DEFAULT 0,
    `competencia3` INTEGER NULL DEFAULT 0,
    `competencia4` INTEGER NULL DEFAULT 0,
    `competencia5` INTEGER NULL DEFAULT 0,
    `nota_total` INTEGER NULL DEFAULT 0,
    `comentario` TEXT NULL,
    `data_envio` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `aluno_id`(`aluno_id`),
    INDEX `simulado_id`(`simulado_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resultados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aluno_id` INTEGER NULL,
    `simulado_id` INTEGER NULL,
    `matematica` INTEGER NULL DEFAULT 0,
    `portugues` INTEGER NULL DEFAULT 0,
    `biologia` INTEGER NULL DEFAULT 0,
    `fisica` INTEGER NULL DEFAULT 0,
    `quimica` INTEGER NULL DEFAULT 0,
    `ingles` INTEGER NULL DEFAULT 0,
    `sociologia` INTEGER NULL DEFAULT 0,
    `filosofia` INTEGER NULL DEFAULT 0,
    `historia` INTEGER NULL DEFAULT 0,
    `geografia` INTEGER NULL DEFAULT 0,
    `educacao_fisica` INTEGER NULL DEFAULT 0,
    `artes` INTEGER NULL DEFAULT 0,
    `total_acertos` INTEGER NULL DEFAULT 0,
    `total_erros` INTEGER NULL DEFAULT 0,
    `total_questoes` INTEGER NULL DEFAULT 0,

    INDEX `aluno_id`(`aluno_id`),
    INDEX `simulado_id`(`simulado_id`),
    UNIQUE INDEX `unique_aluno_simulado`(`aluno_id`, `simulado_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `redacoes` ADD CONSTRAINT `redacoes_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `redacoes` ADD CONSTRAINT `redacoes_simulado_id_fkey` FOREIGN KEY (`simulado_id`) REFERENCES `simulados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultados` ADD CONSTRAINT `resultados_aluno_id_fkey` FOREIGN KEY (`aluno_id`) REFERENCES `alunos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resultados` ADD CONSTRAINT `resultados_simulado_id_fkey` FOREIGN KEY (`simulado_id`) REFERENCES `simulados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
