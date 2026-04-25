import {GetServerSideProps} from "next";
import {prisma} from 'server/db/client'
import {CompleteFormOptions, DriverFormsModel, DriversModel} from "../../../prisma/zod";
import {z} from "zod";
import Driver_Forms from "../../components/collections/DriverForms";

const DataModel = DriversModel.extend({
    DriverForms: z.array(DriverFormsModel).optional()
})

type DataType = z.infer<typeof DataModel>;

const Owner_Forms = ({data, all_forms}: { data: DataType[], all_forms: CompleteFormOptions[] }) => {
    return (
        <Driver_Forms data={data} all_forms={all_forms} mode="oo"/>
    )
}

export default Owner_Forms;




export const getServerSideProps: GetServerSideProps = async (context) => {
    const data = await prisma.drivers.findMany({
        include: {
            DriverForms: true,
            TrucksDriven: {
                include: { Trucks: true },
            },
        },
        where: {
            OwnerOperator: true,
            OR: [{Deleted: false}, {Deleted: null}],
        },
        orderBy: {
            LastName: "asc"
        }
    });

    const all_forms = await prisma.formOptions.findMany({
        where: {
            OOVisible: true,
        },
        include: {
            Forms: true
        },
        orderBy: [{ PdfOrder: 'asc' }, { ID: 'asc' }],
    });

    return {
        props: {
            data: JSON.parse(JSON.stringify(data)),
            all_forms
        }
    }
}
