import { get, set } from "lodash";

let listeners: any[] = [];

/**
 * object path
 * @param path @see https://www.lodashjs.com/docs/lodash.set
 * @param value
 */
export function setItem(path: string | string[], value: any) {
    const loc = JSON.parse(localStorage.getItem("OCS") || "{}");
    set(loc, path, value);
    localStorage.setItem("OCS", JSON.stringify(loc));

    listeners
        .filter((l) => l.path === path)
        .forEach((listener) => {
            listener(value);
        });
}

/**
 * object path
 * @param path @see https://www.lodashjs.com/docs/lodash.get
 * @param defaults 默认值
 * @returns
 */
export function getItem(path: string | string[], defaultValue?: any) {
    const loc = JSON.parse(localStorage.getItem("OCS") || "{}");
    return get(loc, path) || defaultValue;
}
