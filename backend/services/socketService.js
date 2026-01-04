// Socket.io service to share io instance across the application
let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

export function emitToProject(projectId, event, data) {
  if (ioInstance) {
    ioInstance.to(`project:${projectId}`).emit(event, data);
  }
}

