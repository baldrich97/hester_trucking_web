export type User = {
    id?: string;
    password: string;
    username: string;
    email: string
    organization: string
    //accounts: Account[];
}

export type Credentials = {
    username: string;
    password: string;
    email: string;
    organization: string;
}