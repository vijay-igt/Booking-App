import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
    clientId: 'booking-app',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: 10000, // 10 seconds to allow container to warm up
});

let producerInstance: Producer | null = null;
let consumerInstance: Consumer | null = null;

export const getProducer = async (): Promise<Producer | null> => {
    if (!producerInstance) {
        try {
            producerInstance = kafka.producer({
                createPartitioner: Partitioners.LegacyPartitioner,
                retry: {
                    initialRetryTime: 500,
                    retries: 10 // More retries for cold starts
                }
            });
            await producerInstance.connect();
            console.log('✅ Kafka Producer connected');
        } catch (error) {
            console.error('❌ Failed to connect Kafka Producer:', (error as any).message);
            producerInstance = null;
            return null;
        }
    }
    return producerInstance;
};

export const getConsumer = async (groupId: string): Promise<Consumer | null> => {
    try {
        const newConsumer = kafka.consumer({
            groupId,
            retry: {
                initialRetryTime: 500,
                retries: 10
            }
        });
        await newConsumer.connect();
        console.log(`✅ Kafka Consumer connected to group: ${groupId}`);
        consumerInstance = newConsumer;
        return newConsumer;
    } catch (error) {
        console.error(`❌ Failed to connect Kafka Consumer (${groupId}):`, (error as any).message);
        return null;
    }
};

export const disconnectKafka = async () => {
    if (producerInstance) await producerInstance.disconnect();
    if (consumerInstance) await consumerInstance.disconnect();
};
