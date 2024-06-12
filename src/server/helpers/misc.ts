import * as crypto from 'crypto'

export const sha1 = (str: string): string => {

    const shasum = crypto.createHash('sha1');
    shasum.update(str);

    return shasum.digest('hex');
}

export const inMinutes = (minutes: number): number => {

    return minutes * 60 * 1000;
}

export const inHours = (hours: number): number => {

    return hours * 60 * 60 * 1000;
}