export interface IMongoConfig {
  connectionString?: string;
  user?: string;
  password?: string;
}

export type UpdateOptions = {
  new?: boolean;
  upsert?: boolean;
};

export interface IBaseRepository<T> {
  create(entity: Partial<T>, session?: any): Promise<T>;
  updateById(id: string, doc: Partial<T>): Promise<boolean>;
  deleteById(id: string): Promise<boolean>;
  find(filter: Partial<T>, projection?: any, options?: any, callback?: any): Promise<T>;
  findOne(cond: Partial<T>, projection?: any, options?: any): Promise<T>;
  findOneAndUpdate(cond: any, doc: any, options?: any): Promise<T>;
  findAll(cond: Partial<T>, option?: Partial<FindAllOption>): Promise<FindAllResponse<T>>;
  updateOne(filter?: any, update?: any, options?: any, callback?: any): Promise<T>;
  aggregate(pipeline: any[], callback?: any): Promise<any>;
  populate(docs: Array<any> | any, options: any, callback?: any): Promise<any>;
  findAndPopulate(filter: any, options: any, projection?: any, callback?: any): Promise<any>;
  insertMany(docs: Array<Partial<T>>, options?: any, callback?: any): Promise<T[]>;
  updateMany(filter: any, update?: any, options?: any, callback?: any): Promise<T>;
  deleteMany(filter?: any, options?: any, callback?: any): Promise<any>;
}

export interface ILogger {
  info(message?: string, details?: any): void;
  error(message?: string, details?: any): void;
  warn(message?: string, details?: any): void;
  debug(message?: string, details?: any): void;
}

export interface ISystemNotify {
  sendErrorToTelegram(title: string, error?: any): Promise<void>;
  sendSuccessMessageToTelegram(title: string): Promise<void>;
}

export type DeleteResponse = {
  ok?: number;
  n?: number;
} & {
  deletedCount?: number;
};

export type PartialDeep<T> = { [P in keyof T]?: PartialDeep<T[P]> };

export type FindAllOption = {
  fields: string;
  limit: number;
  page: number;
  sort: any;
};

export type FindAllResponse<T> = {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
  data: T[];
};
