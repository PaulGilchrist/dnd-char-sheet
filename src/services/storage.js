import utils from './utils'
const storage = {
    get: (key) => {
        const json = localStorage.getItem(key);
        if (json) {
            return JSON.parse(json);
        }
        return null;
    },
    set: (key, value) => {
        const json = JSON.stringify(value);
        localStorage.setItem(key, json);
        const fullUrl = `http://${window.location.hostname}:3000/api/${key}/`;
        // console.log(fullUrl)
        fetch(fullUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: json
        }).catch((e) => {
            // console.error('Error posting data to API:', e);
        });
    },
    getProperty: (name, propertyName) => {
        const firstName = utils.getFirstName(name);
        const obj = storage.get(firstName);
        if(obj && obj[propertyName]) {
            return obj[propertyName];
        }
        return null;
    },
    setProperty: (name, propertyName, value) => {
        const firstName = utils.getFirstName(name);
        let obj = storage.get(firstName);
        if(!obj) {
            obj = {};
        }
        obj[propertyName] = value;
        storage.set(firstName, obj);
    }
}

export default storage
