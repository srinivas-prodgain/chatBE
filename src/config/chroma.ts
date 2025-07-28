import { CloudClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

const client = new CloudClient();

const chromaCollectionPromise = client.getOrCreateCollection({
    name: "my_collection",
});

export { chromaCollectionPromise };

