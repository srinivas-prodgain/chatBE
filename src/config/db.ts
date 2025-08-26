import mongoose from 'mongoose';
console.log("database.js file is excecuted")


const MONGO_URL = process.env.MONGODB_URL


if (!MONGO_URL) {
    throw new Error("Db url is not there")
}


const connect_to_db = async () => {
    console.log("connecting to DataBase.........")
    try {
        await mongoose.connect(MONGO_URL)
    }
    catch (err) {
        return console.log("error", err)
    }
    console.log("excecuted the connectToDataBase successfully")
}



export { connect_to_db };