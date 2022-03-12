import logger from 'common/logger';
import { Coordinates, Omit, SensorStation, SensorStationMeasurement } from 'common/types';
import { IDataStore } from 'data-store/types';
import { catcher, chunkArray } from 'common/utils';
import { Collection, Db, MongoClient, ObjectID } from 'mongodb';

const NEAR_MAX_DISTANCE = 2500; // 2.5 km
const SENSOR_STATION_COLLECTION = 'sensorStations';

export class MongoDBDataStore implements IDataStore {
  private _mongoClient: MongoClient;
  private _db: Db | null = null;

  constructor(connectionURL: string) {
    this._mongoClient = new MongoClient(connectionURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  public async init(): Promise<void> {
    await this.getDb();

    const collectionSpecs: {
      name: string;
      type: string;
    }[] = await this._db.listCollections({}, { nameOnly: true }).toArray();

    const collectionNames: string[] = collectionSpecs.reduce((acc, val) => {
      return [...acc, val.name];
    }, []);

    if (!collectionNames.includes(SENSOR_STATION_COLLECTION)) {
      logger.debug('Initializing MongoDB collection and indexes...');
      await this._db.createCollection(SENSOR_STATION_COLLECTION);
      const collection = await this.getSensorStationsCollection();
      await collection.createIndex({
        location: '2dsphere',
      });
      await collection.createIndex(
        {
          provider: 1,
          providerId: 1,
        },
        {
          unique: true,
        },
      );
    }
  }

  protected async getDb(): Promise<Db> {
    if (!this._mongoClient.isConnected()) {
      const [, err] = await catcher(this._mongoClient.connect());

      if (err) {
        logger.error(err);
        process.exit(1);
      }

      if (this._db == null) {
        this._db = this._mongoClient.db();
      }
    }

    return this._db;
  }

  protected async getSensorStationsCollection(): Promise<Collection<SensorStation>> {
    const db = await this.getDb();

    return db.collection<SensorStation>(SENSOR_STATION_COLLECTION);
  }

  async getStation(id: string | ObjectID): Promise<SensorStation | null> {
    const collection = await this.getSensorStationsCollection();

    return await collection.findOne<SensorStation>(
      {
        _id: typeof id == 'string' ? new ObjectID(id) : id,
      },
      {
        projection: {
          latestMeasurement: 0,
        },
      },
    );
  }

  async getStationLatestMeasurement(
    id: string | ObjectID,
  ): Promise<SensorStationMeasurement | null> {
    const collection = await this.getSensorStationsCollection();

    const station = await collection.findOne<Pick<SensorStation, 'latestMeasurement'>>(
      {
        _id: typeof id == 'string' ? new ObjectID(id) : id,
      },
      {
        projection: {
          latestMeasurement: 1,
        },
      },
    );
    const { latestMeasurement } = station;

    if (typeof latestMeasurement == 'object') {
      return latestMeasurement;
    }

    return null;
  }

  async getNearestStation(location: Coordinates): Promise<SensorStation | null> {
    const collection = await this.getSensorStationsCollection();
    const { latitude, longitude } = location;

    const nearbyStations = await collection
      .find<SensorStation>(
        {
          location: {
            $nearSphere: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: NEAR_MAX_DISTANCE,
            },
          },
        },
        {},
      )
      .limit(1)
      .toArray();

    if (nearbyStations.length === 0) {
      return null;
    }

    return nearbyStations[0];
  }

  async saveOrUptadeStations(
    stations: Omit<SensorStation, '_id' | 'createdAt' | 'updatedAt' | 'latestMeasurement'>[],
  ): Promise<number> {
    const collection = await this.getSensorStationsCollection();
    const now = new Date();

    let modified = 0;

    for (const chunk of chunkArray(stations, 1000)) {
      const results = await Promise.all(
        chunk.map((station) => {
          const { provider, providerId } = station;

          return collection.updateOne(
            {
              provider,
              providerId,
            },
            {
              $set: {
                ...station,
              },
              $setOnInsert: {
                createdAt: now,
              },
              $currentDate: {
                updatedAt: true,
              },
            },
            {
              upsert: true,
            },
          );
        }),
      );

      modified += results.reduce((acc, curr) => {
        return acc + curr.modifiedCount + curr.upsertedCount;
      }, 0);
    }

    return modified;
  }

  async updateSensorStationLatestMeasurement(
    id: string | ObjectID,
    latestMeasurement: SensorStationMeasurement,
  ): Promise<number> {
    const collection = await this.getSensorStationsCollection();

    const result = await collection.updateOne(
      {
        _id: typeof id == 'string' ? new ObjectID(id) : id,
      },
      {
        $set: {
          latestMeasurement,
        },
      },
    );

    return result.modifiedCount;
  }

  async cleanup(daysBack: number): Promise<number> {
    const collection = await this.getSensorStationsCollection();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysBack);

    const result = await collection.deleteMany({
      updatedAt: { $lte: pastDate },
    });

    return result.deletedCount;
  }
}
