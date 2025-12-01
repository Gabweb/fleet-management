export interface SignContent {
    username: string;
}

export default interface TokenSigner {
    sign(content: SignContent, options: any): string;
    verify(token: string): boolean;
    refresh(token: string): string | null;
}
