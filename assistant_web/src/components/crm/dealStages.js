// Shared between DealsPanel's list/grid views and DealsPipeline's Kanban
// view so the stage set and its colors stay in one place instead of
// drifting between the two.
export const DEAL_STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];

export const STAGE_LABELS = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const getStageColor = (stage) => {
  switch ((stage || "").toLowerCase()) {
    case "qualified":
      return "blue";
    case "proposal":
      return "purple";
    case "negotiation":
      return "orange";
    case "won":
      return "green";
    case "lost":
      return "red";
    default:
      return "gray";
  }
};
