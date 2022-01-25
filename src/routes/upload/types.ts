export interface FileUploadProps {
    name: string;
    size: number;
    mimetype: string;
    tempFilePath: string;
    mv(destination: string, fn?:(err: any) => void): void
}