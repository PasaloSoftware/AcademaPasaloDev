declare module 'archiver' {
  import { Writable } from 'stream';

  export interface ArchiverOptions {
    zlib?: {
      level?: number;
    };
  }

  export interface Archiver {
    on(event: 'error', listener: (error: Error) => void): this;
    pipe(destination: Writable): this;
    file(source: string, data: { name: string }): this;
    finalize(): Promise<void>;
  }

  export interface ArchiverFactory {
    (format: string, options?: ArchiverOptions): Archiver;
  }

  const archiver: ArchiverFactory;
  export default archiver;
}
