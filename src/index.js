const Keyv = require("keyv");
const util = require("util");

class UserData {
  constructor(id, data, db) {
    this.id = id;
    this.data = data;
    this.db = db;
  }

  async write(newData) {
    Object.keys(newData).forEach((key) => {
      if (typeof newData[key] === "object" && newData[key] !== null) {
        Object.keys(newData[key]).forEach((subKey) => {
          this.data[key][subKey] = newData[key][subKey];
        });
      } else {
        this.data[key] = newData[key];
      }
    });

    this.data.modified = Date.now();
    await this.db.set(this.id, this.data);
    return this;
  }

  async delete() {
    await this.db.delete(this.id);
    return true;
  }
  [util.inspect.custom](depth, options) {
    // Customize the representation of the object when logged to the console
    const filteredData = { ...this.data };
    // Omitting 'db' property from the output
    delete filteredData.db;
    return util.inspect(filteredData, { ...options, depth: null });
  }
}

class DogaDB {
  constructor(options) {
    this.db = new Keyv(`sqlite://${options.path}`, options.keyv || {});
    this.structure = options.structure;
    this.on = this.db.on;

    if (!this.structure) throw new Error("Please provide structure to DogaDB");

    if (!this.structure.modified) this.structure.modified = Date.now();
  }

  async get(id, createIfNot = false) {
    let data = (await this.db.get(id)) || {};
    if (!data) return null;
    let structure = this.structure;
    let obj = {};
    structure.id = id;

    Object.keys(structure).forEach((key) => {
      if (!data[key]) data[key] = structure[key];
      if (typeof structure[key] === "object" && structure[key] !== null) {
        obj[key] = {};
        Object.keys(structure[key]).forEach((subKey) => {
          obj[key][subKey] = data[key][subKey] || structure[key][subKey];
        });
      } else {
        obj[key] = data[key];
      }
    });

    return new UserData(id, obj, this.db);
  }
  async exists(id) {
    let exists = await this.db.get(id);
    return exists ? true : false;
  }
  async getID(keySearch, valueSearch) {
    // find id by key and value
    // for example, getID('username', 'doga') will return the id of the user with username 'doga'
    let found = null;
    for await (const [key, value] of this.db.iterator()) {
      if (value[keySearch] === valueSearch) {
        found = key;
        break;
      }
    }
    return found;
  }
}

module.exports = DogaDB;
