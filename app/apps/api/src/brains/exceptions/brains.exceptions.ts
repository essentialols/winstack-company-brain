import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class BrainNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Brain not found: ${identifier}`);
  }
}

export class SaveNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Save not found: ${identifier}`);
  }
}

export class IssueNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Issue not found: ${identifier}`);
  }
}

export class BrainAccessDeniedException extends ForbiddenException {
  constructor(action: string) {
    super(`You do not have permission to ${action} this brain`);
  }
}
