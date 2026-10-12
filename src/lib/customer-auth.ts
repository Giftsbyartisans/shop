import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

// Public registration creates ordinary users. Admin membership is managed in
// Cognito, never accepted from a registration form or client attribute.
Amplify.configure(outputs);

