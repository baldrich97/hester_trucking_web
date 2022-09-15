import React, {FunctionComponent} from 'react';
import {GetServerSideProps} from "next";
import {trpc} from "../../utils/trpc";

type LoadType = {
    id: string,
    description: string
}

type Props = {
    data: LoadType | null
}

const LoadType: FunctionComponent<Props> = (props) => {

    const {data} = props;

    return (
        <>Nothing yet...</>
    )


};

export default LoadType;

/*
export const getServerSideProps: GetServerSideProps = async (context) => {
    let data;

    if (!context || !context.params || !context.params.id || typeof (context.params.id) !== 'string') {
        data = null;
    } else {
        data = trpc.useQuery(['loadtypes.get', {id: context.params.id}]);
    }

    return {
        props: {
            data
        }, // will be passed to the page component as props
    }
}*/
