import {GetServerSideProps} from "next";
import {prisma} from 'server/db/client'
import {CompleteFormOptions} from "../../../prisma/zod";
import Driver_Forms, {type DriverFormsDataType} from "../../components/collections/DriverForms";

const W2_Forms = ({data, all_forms}: { data: DriverFormsDataType[]; all_forms: CompleteFormOptions[] }) => {
    return (
        <Driver_Forms data={data} all_forms={all_forms} mode="w2"/>
    )
}

export default W2_Forms;




export const getServerSideProps: GetServerSideProps = async (context) => {
    const data = await prisma.drivers.findMany({
        include: {
            DriverForms: true,
            States: true,
        },
        where: {
            OwnerOperator: {
                not: true
            },
            OR: [{Deleted: false}, {Deleted: null}],
        },
        orderBy: {
            LastName: "asc"
        }
    });

    const all_forms = await prisma.formOptions.findMany({
        where: {
            W2Visible: true,
        },
        include: {
            Forms: true
        },
        orderBy: [{Forms: {DisplayName: "asc"}}, {Form: "asc"}],
    });

    return {
        props: {
            data: JSON.parse(JSON.stringify(data)),
            all_forms
        }
    }
}
