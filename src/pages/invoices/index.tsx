import React, { FunctionComponent } from 'react';
import { trpc } from "../../utils/trpc"

type LoadType = {
    id: string,
    description: string,
}

type Props = {
    types: LoadType[]
}

const Invoices: FunctionComponent<Props> = (props) => {

    //const { types } = props;

    return (
        <div>
            Invoices will be here soon...
        </div>
    )
};

export default Invoices;

/*
export async function getServerSideProps() {
    const data = trpc.useQuery(['loadtypes.getAll']);

    return {
        props: {
            types: data
        }, // will be passed to the page component as props
    }
}*/
