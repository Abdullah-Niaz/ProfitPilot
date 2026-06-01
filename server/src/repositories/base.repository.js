export const createRepository = (Model) => ({
  create: (payload) => Model.create(payload),
  findByWorkspace: (workspace, query = {}) => Model.find({ workspace, ...query }).sort({ createdAt: -1 }),
  findOneInWorkspace: (_id, workspace) => Model.findOne({ _id, workspace }),
  updateInWorkspace: (_id, workspace, payload) => Model.findOneAndUpdate({ _id, workspace }, payload, { new: true }),
  deleteInWorkspace: (_id, workspace) => Model.findOneAndDelete({ _id, workspace })
});
