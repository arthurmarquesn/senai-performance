declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  import type { MessageHandler } from "pdfjs-dist/types/src/shared/message_handler";

  export const WorkerMessageHandler: {
    setup(handler: MessageHandler, port: unknown): void;
  };
}
