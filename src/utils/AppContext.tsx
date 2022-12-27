/*
import {createContext, ReactNode, useContext, useState} from "react";

type appContext = {
    currentParentRoute: string;
};

const appContextDefaultValues: appContext = {
    currentParentRoute: 'Dashboard'
};

const AppContext = createContext<appContext>(appContextDefaultValues);

export function useAppContext() {
    return useContext(AppContext);
};

type Props = {
    children: ReactNode;
};

export function AppContetProvider({children}: Props) {
    const [parentRoute, setParentRoute] = useState<string>('Dashboard');

    const navigate
    const value = {

    }
    return (
        <>
            <AppContext.Provider value={value}>
                {children}
            </AppContext.Provider>
        </>
    );
}*/
export {};