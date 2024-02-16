import utils from './utils'
const storage = {
    get: (name, propertyName) => {
        const firstName = utils.getFirstName(name);
        // console.log(`${firstName} ${propertyName}`);
        const json = localStorage.getItem(firstName);
        if (json) {
            const value = JSON.parse(json)[propertyName];
            if (value) {
                return value;
            }
        }
        return null;
    },
    set: (name, propertyName, value) => {
        const firstName = utils.getFirstName(name);
        let json = localStorage.getItem(firstName);
        let objValue = {};
        if (json) {
            objValue = JSON.parse(json);
        }
        objValue[propertyName] = value;
        json = JSON.stringify(objValue);
        localStorage.setItem(firstName, json);
        const fullUrl = `http://${window.location.hostname}:3000/${firstName}/`;
        // console.log(fullUrl)
        fetch(fullUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: json
        }).catch((error) => {
            // console.error('Error posting data to API:', error);
        });
    }
}

export default storage
