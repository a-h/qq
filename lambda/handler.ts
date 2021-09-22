import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const handler = async (_event: APIGatewayProxyEventV2) => {
	const response: APIGatewayProxyStructuredResultV2 = {
		body: "test",
	};
	return response;
};
