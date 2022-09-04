import React, { FunctionComponent } from 'react';
import { trpc } from "../../utils/trpc"

type LoadType = {
    id: string,
    description: string,
}

type Props = {
    types: LoadType[]
}

const LoadTypes: FunctionComponent<Props> = (props) => {

    const { types } = props;

    return (
        <div>
            {types.map((loadtype: LoadType) => {
                return (<>{loadtype.id} | {loadtype.description}</>)
            })}
        </div>
    )
};

export default LoadTypes;

/*
export async function getServerSideProps() {
    const data = trpc.useQuery(['loadtypes.getAll']);

    return {
        props: {
            types: data
        }, // will be passed to the page component as props
    }
}*/
