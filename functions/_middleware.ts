export async function onRequest(context: EventContext<any, string, any>) {
  return context.next()
}
