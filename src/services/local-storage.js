const storage = {
    get: (name, propertyName) => {
        // console.log(`${name} ${propertyName}`);
        const json = localStorage.getItem(name);
        if (json) {
            const value = JSON.parse(json)[propertyName];
            if (value) {
                return value;
            }
        }
        return null;
    },
    set: (name, propertyName, value) => {
        // console.log(`${name} ${propertyName} ${value}`);
        let json = localStorage.getItem(name);
        let objValue = {};
        if (json) {
            objValue = JSON.parse(json);
        }
        objValue[propertyName] = value;
        json = JSON.stringify(objValue);
        localStorage.setItem(name, json);
        const apiUrl = sessionStorage.getItem('apiUrl');
        if(apiUrl) {
            const fullUrl = `${apiUrl}/${name}/`;
            console.log(fullUrl)
            fetch(fullUrl, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: json
            }).catch((error) => {
                console.error('Error posting data to API:', error);
            });
        }
    }
}

export default storage
