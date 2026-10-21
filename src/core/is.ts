export const isUndefined = (v: any): v is undefined => v === undefined;
export const isNull = (v: any): v is null => v === null;
export const isString = (v: any): v is string => typeof v === 'string';
export const isNumber = (v: any): v is number => typeof v === 'number';
export const isBoolean = (v: any): v is boolean => typeof v === 'boolean';
export const isFunction = (v: any): v is Function => typeof v === 'function';
export const isObject = (v: any): v is Record<string, any> => typeof v === 'object' && v !== null;
export const isArray = (v: any): v is any[] => Array.isArray(v);
export const isError = (v: any): v is Error => v instanceof Error;
