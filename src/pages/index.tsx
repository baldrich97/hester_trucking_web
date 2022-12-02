import InvoicePrintableBasic from "../components/objects/InvoicePrintableBasic";
import {CompleteInvoices} from "../../prisma/zod";
import {GetServerSideProps} from "next";
import {prisma} from "../server/db/client";

const Home = ({invoice}: {invoice: CompleteInvoices}) => {

    console.log(invoice)

    return (
        <>
            Dashboard coming soon...
            <br/>
                <InvoicePrintableBasic invoice={invoice}/>
            <br/>
            Please feel free to check out the other pages!
        </>
    );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const invoice = await prisma.invoices.findFirst({
        where: {
          ID: 3
        },
        include: {
            Customers: {
                include: {
                    States: true
                }
            },
            Loads: {
               include: {
                   LoadTypes: true,
                   Trucks: true,
                   Drivers: true,
                   DeliveryLocations: true
               }
            },
        }
    })

    return {
        props: {
           invoice: JSON.parse(JSON.stringify(invoice))
        }
    }
}