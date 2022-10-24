import {
  mongo,
  model,
  Document,
  Schema,
  Model,
  FilterQuery,
  UpdateQuery,
  QueryOptions,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
  Callback,
  ProjectionType,
  PipelineStage,
  Aggregate,
  PopulateOptions,
  InsertManyOptions,
  CallbackWithoutResult,
  ClientSession,
  ReturnsNewDoc
} from 'mongoose';

import { FindAllOption, FindAllResponse, IBaseRepository, UpdateOptions } from './definitions';

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  model: Model<T & Document>;

  constructor(name: string, schema: Schema, collection: string) {
    this.model = model<T & Document>(name, schema, collection);
  }

  protected removeUndefinedValue(object: Record<string, unknown>): void {
    for (const key of Object.keys(object)) {
      if (object[key] === undefined) delete object[key];
    }
  }

  /**
   * Create body of $set function. It will use to update sub-document.
   *
   * Return: { "subDocumentName.$.key": "value" }
   */
  protected createSetOfSubDocument<Doc, SubDoc>(
    subDocumentName: keyof Doc,
    subDocument: Partial<SubDoc>
  ): {
    [key: string]: unknown;
  } {
    const object: Record<string, string> = {};
    for (const key of Object.keys(subDocument)) {
      object[`${'subDocumentName'}.$.${key}`] = (subDocument as any)[key];
    }
    return object;
  }

  protected createObjectID(): string {
    return new mongo.ObjectId().toHexString();
  }

  @Repository(false)
  async create(entity: Partial<T>, session?: ClientSession): Promise<any> {
    delete (entity as any).id;
    const _entity = session
      ? await this.model.create([entity], { session: session })
      : await this.model.create(entity);
    if (Array.isArray(_entity) && _entity.length === 1) return _entity[0];
    return _entity;
  }

  @Repository()
  async updateById(id: string, doc: Partial<T>): Promise<boolean> {
    delete (doc as any).id;

    const raw = await this.model.updateOne({ _id: id as any }, doc as UpdateQuery<T & Document>);
    if (raw.matchedCount === 0) {
      throw new Error('Update failed');
    }
    return raw.modifiedCount === 0 ? false : true;
  }

  @Repository()
  async findOne(
    cond?: FilterQuery<T>,
    projection?: ProjectionType<T> | null,
    options?: QueryOptions<T> | null
  ): Promise<T> {
    const entity = await this.model.findOne(cond, projection, options).lean();
    return entity as T;
  }

  @Repository()
  async findOneAndUpdate(
    cond: FilterQuery<T>,
    doc: UpdateQuery<T>,
    options: QueryOptions<T>
  ): Promise<T> {
    delete (doc as any).id;

    const entity = await this.model
      .findOneAndUpdate(cond, doc, { options, upsert: true, new: true })
      .lean();

    return entity as T;
  }

  @Repository()
  async findAll(cond: Partial<T>, option: Partial<FindAllOption>): Promise<FindAllResponse<T>> {
    if (!option) option = {};
    const { fields } = option;
    let { sort = 'id', limit = 50, page = 1 } = option;

    if (sort && sort.includes('id') && !sort.includes('_id')) {
      sort = sort.replace('id', '_id');
    }

    if (limit > 50 || limit < 1) limit = 50;
    if (page < 1) page = 1;

    const count = await this.model.countDocuments(cond as FilterQuery<T & Document>);

    const items = await this.model
      .find(cond as FilterQuery<T & Document>)
      .select(selectFieldsShow(fields))
      .limit(limit)
      .skip(limit * (page - 1))
      .sort(sort)
      .lean();

    transformEntities(items);

    return {
      total: count,
      limit,
      page,
      totalPages: Math.ceil(count / limit),
      data: items as unknown as T[]
    };
  }

  @Repository()
  async deleteById(id: string): Promise<boolean> {
    const raw = await this.model.deleteOne({ _id: id as any });

    if (raw.deletedCount === 0) {
      throw new Error('Delete failed');
    }
    return raw.deletedCount === 0 ? false : true;
  }

  @Repository()
  async count(cond: Partial<T>): Promise<number> {
    const count = await this.model.countDocuments(cond as FilterQuery<T & Document>);
    return count;
  }

  @Repository()
  async updateOne(
    filter?: FilterQuery<T>,
    update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options?: QueryOptions<T> | null,
    callback?: Callback<UpdateWriteOpResult>
  ): Promise<T> {
    const raw = await this.model.updateOne(filter, update, options, callback);
    return raw as unknown as T;
  }

  @Repository()
  async find(
    filter: FilterQuery<T>,
    projection?: ProjectionType<T> | null | undefined,
    options?: QueryOptions<T> | null | undefined,
    callback?: Callback<any> | undefined
  ): Promise<T> {
    const entity = await this.model.find(filter, projection, options, callback);
    return entity as unknown as T;
  }

  @Repository()
  async aggregate(pipeline: PipelineStage[], callback?: Callback<any>): Promise<any> {
    // Convert object pipeline to array
    const values = Object.values(pipeline);
    const entity = await this.model.aggregate(values, callback);
    return entity as unknown as T;
  }

  @Repository()
  async populate(
    docs: Array<any> | any,
    options: PopulateOptions | Array<PopulateOptions> | string,
    callback?: Callback<any>
  ): Promise<any> {
    if (typeof docs['0'] === 'object') {
      const values = Object.values(docs);
      const entity = await this.model.populate(values, options, callback);
      return entity as unknown as T;
    } else {
      const entity = await this.model.populate(docs, options, callback);
      return entity as unknown as T;
    }
  }

  @Repository()
  async findAndPopulate(
    filter: FilterQuery<T>,
    options: PopulateOptions | (PopulateOptions | string)[],
    projection?: ProjectionType<T> | null | undefined,
    callback?: Callback<any>
  ): Promise<any> {
    const entity = await this.model.find(filter, projection, callback).populate(options);
    return entity as unknown as T;
  }

  @Repository()
  async insertMany(
    docs: Array<Partial<T>>,
    options?: InsertManyOptions & { lean: true },
    callback?: Callback<any>
  ): Promise<any> {
    const values = Object.values(docs);
    const entity = this.model.insertMany(values, options, callback);
    return entity as unknown as T;
  }

  @Repository()
  async deleteMany(
    filter?: FilterQuery<T>,
    options?: QueryOptions<T>,
    callback?: CallbackWithoutResult
  ): Promise<any> {
    const entity = await this.model.deleteMany(filter, options, callback);
    return entity as unknown as T;
  }

  @Repository()
  async updateMany(
    filter?: FilterQuery<T>,
    update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
    options?: QueryOptions<T> | null,
    callback?: Callback
  ): Promise<T> {
    const entity = await this.model.updateMany(filter, update, options, callback);
    return entity as unknown as T;
  }
}

export function Repository(transformInputCondition = true, transformOutputEntities = true) {
  return (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>
  ): void => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const oldFunc = descriptor.value!;
    descriptor.value = async function (...args: any[]) {
      const newQuery = transformQueryCondition(args[0]);
      if (transformInputCondition && newQuery !== null) {
        args[0] = newQuery;
      }
      const entities = await oldFunc.apply(this, args);

      transformOutputEntities && transformEntities(entities);

      return entities;
    };
  };
}

function transformQueryCondition(cond: Record<string, unknown>): Record<string, unknown> | null {
  if (!isObject(cond)) return null;

  const result = { ...cond };
  if (result.id) {
    result._id = result.id;
    delete result.id;
  }
  return result;
}

function transformEntities(entity: any): void {
  if (!isObject(entity)) return;

  if (Array.isArray(entity)) {
    entity.map((item) => {
      if (item?._id) {
        item.id = item._id.toString();
      }
    });

    return;
  }

  if (entity._id) {
    entity.id = entity._id.toString();
  }
}

function isObject(entity: any) {
  return typeof entity === 'object' && entity != null;
}

function selectFieldsShow(fields?: string) {
  if (fields) {
    return fields.split(',').join(' ');
  }

  return '';
}
