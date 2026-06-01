export class ChariowError extends Error {
  status?: number
  data?: unknown

  constructor(
    message: string,
    status?: number,
    data?: unknown
  ) {
    super(message)

    this.name = "ChariowError"
    this.status = status
    this.data = data
  }
}
