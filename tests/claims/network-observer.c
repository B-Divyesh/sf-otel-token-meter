#define _GNU_SOURCE

#include <errno.h>
#include <fcntl.h>
#include <string.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <unistd.h>

static void record_attempt(const char *event) {
  const char *path = getenv("OTEL_TOKEN_METER_NETWORK_LOG");
  if (path == NULL) return;
  int fd = open(path, O_WRONLY | O_CREAT | O_APPEND, 0600);
  if (fd < 0) return;
  write(fd, event, strlen(event));
  close(fd);
}

__attribute__((constructor)) static void observer_ready(void) {
  record_attempt("observer-ready\n");
}

int connect(int socket, const struct sockaddr *address, socklen_t length) {
  (void)socket;
  (void)address;
  (void)length;
  record_attempt("connect\n");
  errno = ECONNREFUSED;
  return -1;
}

ssize_t sendto(int socket, const void *buffer, size_t size, int flags,
               const struct sockaddr *address, socklen_t length) {
  (void)socket;
  (void)buffer;
  (void)size;
  (void)flags;
  (void)address;
  (void)length;
  record_attempt("sendto\n");
  errno = ECONNREFUSED;
  return -1;
}

ssize_t sendmsg(int socket, const struct msghdr *message, int flags) {
  (void)socket;
  (void)message;
  (void)flags;
  record_attempt("sendmsg\n");
  errno = ECONNREFUSED;
  return -1;
}
