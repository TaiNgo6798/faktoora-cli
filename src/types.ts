export type DataObject = Record<string, any>;
export type DataArray = DataObject[];

export type BumpOptions = {
  shouldCreateMr?: boolean;
  reviewerName?: string;
  applyToAll?: boolean;
  branchName?: string;
  destinationBranch?: string;
};

export type CommandOptions = {
  createMr?: boolean;
  reviewer?: string;
  force?: boolean;
  branch?: string;
  destination?: string;
};
