// A one-off message shown on the lift page after saving, e.g. "New best at 185 lbs!".
// The form pages pass it along when they navigate back, as router "state":
//   navigate(`/lifts/${id}`, { state: { flash } })
// and the lift page reads it with useLocation().state.

export interface FlashMessage {
  text: string
  isRecord: boolean
}

export interface LiftPageState {
  flash?: FlashMessage
}
