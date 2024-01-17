const storage = {
    get: (name, propertyName) => {
        const json = localStorage.getItem(name);
        if(json) {
            const value = JSON.parse(json)[propertyName];
            if(value) {
                return value;
            }
        }
        return null;
    },
    set: (name, propertyName, value) => {
        const json = localStorage.getItem(name);
        let objValue = {};
        if(json) { 
            objValue = JSON.parse(json);
        }
        objValue[propertyName] = value;
        localStorage.setItem(name, JSON.stringify(objValue));
}
}

export default storage
