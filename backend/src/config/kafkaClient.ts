import { Kafka, Producer, Consumer, Partitioners } from 'kafkajs';

const brokersEnv = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER;
const useLocalKafka = process.env.NODE_ENV !== 'production';
const kafkaEnabled = Boolean(brokersEnv) || useLocalKafka;

const kafka = kafkaEnabled ? new Kafka({
    clientId: 'booking-app',
    brokers: (brokersEnv || 'localhost:9092').split(','),
    connectionTimeout: 10000,
}) : null;

let producerInstance: Producer | null = null;
let consumerInstance: Consumer | null = null;
let kafkaDisabledLogged = false;

const logKafkaDisabled = () => {
    if (kafkaDisabledLogged) return;
    console.warn('[Kafka] Disabled. Set KAFKA_BROKERS to enable.');
    kafkaDisabledLogged = true;
};

export const getProducer = async (): Promise<Producer | null> => {
    if (!kafka) {
        logKafkaDisabled();
        return null;
    }
    if (!producerInstance) {
        try {
            producerInstance = kafka.producer({
                createPartitioner: Partitioners.LegacyPartitioner,
                retry: {
                    initialRetryTime: 500,
                    retries: 10
                }
            });
            await producerInstance.connect();
            console.log('✅ Kafka Producer connected');
        } catch (error) {
            console.error('❌ Failed to connect Kafka Producer:', (error as any).message);
            producerInstance = null;
            return null;
        }
    } else {
        try {
            await producerInstance.connect();
        } catch (error) {
            console.error('❌ Failed to reconnect Kafka Producer:', (error as any).message);
            producerInstance = null;
            return null;
        }
    }
    return producerInstance;
};

export const getConsumer = async (groupId: string): Promise<Consumer | null> => {
    if (!kafka) {
        logKafkaDisabled();
        return null;
    }
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
    if (producerInstance) {
        await producerInstance.disconnect();
        console.log('Kafka Producer disconnected');
        producerInstance = null;
    }
    if (consumerInstance) {
        await consumerInstance.disconnect();
        console.log('Kafka Consumer disconnected');
        consumerInstance = null;
    }
};
