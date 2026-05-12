import {useRouter} from "next/router";
import {useEffect} from "react";

const PageNotFound = () => {
    const router = useRouter();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            void router.replace("/");
        }, 3000);
        return () => clearTimeout(timeoutId);
    }, [router]);

    return (
        <>
            This page does not exist. Redirecting to dashboard...
        </>
    );
};

export default PageNotFound;
