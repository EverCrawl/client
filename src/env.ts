
//@ts-ignore
let env = import.meta.env
const DEBUG = (env.MODE === "development");
//@ts-ignore
window.DEBUG = DEBUG;

export { }