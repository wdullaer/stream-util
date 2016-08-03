declare var describe: (desc: string, callback: () => void) => void;
declare var it: (desc: string, callback: (done: () => void) => Promise<any> | void) => void;
declare var before: (callback: () => Promise<any> | void) => void;
