declare module 'react-native-fs' {
  export interface DownloadResult {
    statusCode: number;
  }

  export interface DownloadProgressCallbackResult {
    bytesWritten: number;
    contentLength: number;
  }

  export interface DownloadFileOptions {
    fromUrl: string;
    toFile: string;
    progress?: (res: DownloadProgressCallbackResult) => void;
    progressDivider?: number;
  }

  export interface FileStatResult {
    size: number;
  }

  export interface DownloadFileResult {
    promise: Promise<DownloadResult>;
  }

  interface RNFSStatic {
    DocumentDirectoryPath: string;
    mkdir(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    stat(path: string): Promise<FileStatResult>;
    unlink(path: string): Promise<void>;
    downloadFile(options: DownloadFileOptions): DownloadFileResult;
  }

  const RNFS: RNFSStatic;
  export default RNFS;
}
