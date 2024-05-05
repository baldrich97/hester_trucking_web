import {z} from 'zod';

export const isNumber =  z.preprocess((val) => {
    if (val === '') val = 0;
    if (typeof(val) === 'string') {
        return parseInt(val, 10);
    }
    return val;
}, z.number()).nullish();

export const parseDate = z.preprocess( arg => typeof arg == 'string' ? new Date( arg ) : new Date(), z.date() )