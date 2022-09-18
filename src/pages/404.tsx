import {useRouter} from "next/router";

const PageNotFound = () => {
    const router = useRouter();

    setTimeout(async () => {
        await router.replace('/');
    }, 3000)

    return (
        <>
            This page does not exist. Redirecting to dashboard...
        </>
    );
};

export default PageNotFound;
