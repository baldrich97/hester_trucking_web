import React from "react";
import InvoiceObject from "../../components/objects/Invoice";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {InvoicesModel, CustomersModel, LoadsModel, WeekliesModel} from "../../../prisma/zod";
import { z } from "zod";

type InvoicesType = z.infer<typeof InvoicesModel>;
type LoadsType = z.infer<typeof LoadsModel>;
type CustomersType = z.infer<typeof CustomersModel>;
type WeekliesType = z.infer<typeof WeekliesModel>;

const Invoice = ({
  initialInvoice,
  loads,
  customers,
  invoices,
    weeklies
}: {
  initialInvoice: InvoicesType;
  loads: LoadsType[];
  customers: CustomersType[];
  invoices: InvoicesType[] | null;
  weeklies: WeekliesType[] | null;
}) => {
  return (
    <InvoiceObject
      initialInvoice={initialInvoice}
      customers={customers}
      loads={loads}
      invoices={invoices}
      weeklies={weeklies}
    />
  );
};

export default Invoice;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id;

  let initialInvoice;

  if (id && typeof id === "string") {
    initialInvoice = await prisma.invoices.findFirst({
      where: {
        ID: parseInt(id),
      },
      include: {
        Customers: true,
        Loads: true,
      },
    });
  }

  if (!initialInvoice) {
    return {
      redirect: {
        permanent: false,
        destination: "/invoices",
      },
    };
  }

  const customers = await prisma.customers.findMany({});

  const loads = await prisma.loads.findMany({
    where: {
      InvoiceID: initialInvoice.ID,
    },
    include: {
      LoadTypes: true,
      DeliveryLocations: true,
      Drivers: true,
      Trucks: true,
    },
  });

  const weeklies = await prisma.weeklies.findMany({
    where: {
      InvoiceID: initialInvoice.ID
    },
    include: {
      Jobs: {
        include: {
          Loads: {
            include: {
              LoadTypes: true,
              DeliveryLocations: true,
              Drivers: true,
              Trucks: true
            }
          }
        }
      }
    }
  })

  let invoices = null;

  if (initialInvoice.Consolidated) {
    invoices = await prisma.invoices.findMany({
      where: {
        ConsolidatedID: initialInvoice.ID,
      },
      include: {
        Loads: true,
      },
    });
  }

  return {
    props: {
      initialInvoice: JSON.parse(JSON.stringify(initialInvoice)),
      customers,
      loads: JSON.parse(JSON.stringify(loads)),
      invoices: JSON.parse(JSON.stringify(invoices)),
      weeklies: JSON.parse(JSON.stringify(weeklies)),
    },
  };
};
