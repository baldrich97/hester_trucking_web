import { promisify } from "util";
import stream from 'stream';
import DailySheetFull from "../../../../components/objects/DailySheetFull";
import {prisma} from "../../../../server/db/client";
import {renderToStream} from "@react-pdf/renderer";
import moment from "moment";

const pipeline = promisify(stream.pipeline);

const handler = async (req, res) => {
    const { ID } = req.query;

    if (!ID) {
        return;
    }

    const input = {week: ID.split('|')[1], sheet: ID.split('|')[0], type: ID.split('|')[2]}

    if (input.type === 'partial') {
        const daily = await prisma.dailies.findUnique({where: {ID: parseInt(input.sheet)}})
        input.lastDate = daily.LastPrinted ?? new Date();
    }

    await prisma.dailies.update({
        where: {
            ID: parseInt(input.sheet)
        }, data: {
            LastPrinted: new Date()
        }
    })

    const week = moment(input.week).format("l") + " - " + moment(input.week).add(6, "days").format("l")

    processLoads(input)
        .then(async (sheet) => {
            const stream = await renderToStream(<DailySheetFull sheet={sheet} week={week}/>)
            res.setHeader('Content-Type', 'application/pdf');
            const filename = "DailySheet-" + 4;
            res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
            await pipeline(stream, res);
        })
        .catch(error => {
            console.error(error, 'ERROERD'); // Handle errors here
        });
};

export default handler;

const processLoads = async (input) => {
    return new Promise(async (resolve, reject) => {
        try {
            const sheet = await prisma.dailies.findUnique({
                where: {
                    ID: parseInt(input.sheet)
                },
                include: {
                    Jobs: {
                        include: {
                            Loads: input.type === 'partial' ? {
                                where: {
                                    Created: {
                                        gt: input.lastDate
                                    }
                                }
                            } : true,
                            Customers: true,
                            Drivers: true,
                            DeliveryLocations: true,
                            LoadTypes: true
                        }
                    },
                    Drivers: true
                }
            });

            if (!sheet) {
                reject('Missing Sheet');
            }

            resolve(sheet);

            // console.log('IN HERE WTF', loads, start, end, input)
            //
            // const jobs = await groupJobs(loads);
            //
            // await formatSheet(jobs).then(async (sheet) => {
            //     resolve(sheet);
            // }).catch((error) => {
            //     reject(error)
            // });
        } catch (error) {
            reject(error);
        }
    });
};

const formatSheet = async (jobs) => {
    return new Promise(async (resolve, reject) => {
        let sheet = {...jobs[0].Drivers, Jobs: []};
        await Promise.all(jobs.map((job) => {
            sheet.Jobs.push(job)
        }))

        if (sheet.Jobs.length > 0) {
            resolve(sheet)
        } else {
            reject('No grouped')
        }
    })
}

const groupJobs = async (loads) => {
    return new Promise(async (resolve, reject) => {
        let jobs = [];
        await Promise.all(loads.map(async (load) => {
            console.log('LOAD', load)
            const found = jobs.findIndex((job) => job.ID === load.JobID);
            if (found !== -1) {
                console.log('IN HERE')
                jobs[found].Loads = [...jobs[found].Loads, load]
            } else {
                const job = await prisma.jobs.findUnique({
                    where: { ID: load.JobID },
                    include: { Customers: true, Drivers: true, DeliveryLocations: true, LoadTypes: true }
                });
                console.log(';ALSDKJ;LASKDF')
                console.log('JOB', job)
                job.Loads = [load];
                jobs.push(job);
            }
        }))

        if (jobs.length > 0) {
            resolve(jobs)
        } else {
            reject('No jobs')
        }
    })
}