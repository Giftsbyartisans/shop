import outputs from '../../amplify_outputs.json';
import { fetchTokenSession } from './auth-session';

// Amplify's generated userPool client obtains AWS credentials before sending
// GraphQL requests. These account-only operations need just the Cognito JWT.
export async function accountShoppingRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = (await fetchTokenSession()).tokens?.accessToken.toString();
  if (!token) throw new Error('Sign in to sync your shopping items.');
  const response = await fetch(outputs.data.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length || !result.data) throw new Error('Could not sync your shopping items. Please try again.');
  return result.data as T;
}

type Result<T> = { data: T; errors?: { message: string }[] };
type Cart = { id: string; cartId?: string | null; items: unknown };
type Favorite = { id: string; listingId: string };
const cartFields = 'id cartId items';
const favoriteFields = 'id listingId';

export const accountCart = {
  async get(input: { id: string }): Promise<Result<Cart | null>> {
    const data = await accountShoppingRequest<{ getCustomerCart: Cart | null }>(`query Cart($id: ID!) { getCustomerCart(id: $id) { ${cartFields} } }`, input);
    return { data: data.getCustomerCart };
  },
  async create(input: Cart): Promise<Result<Cart | null>> {
    const data = await accountShoppingRequest<{ createCustomerCart: Cart | null }>(`mutation CreateCart($input: CreateCustomerCartInput!) { createCustomerCart(input: $input) { ${cartFields} } }`, { input });
    return { data: data.createCustomerCart };
  },
  async update(input: Cart): Promise<Result<Cart | null>> {
    const data = await accountShoppingRequest<{ updateCustomerCart: Cart | null }>(`mutation UpdateCart($input: UpdateCustomerCartInput!) { updateCustomerCart(input: $input) { ${cartFields} } }`, { input });
    return { data: data.updateCustomerCart };
  },
};

export const accountFavorite = {
  async list(options: { limit: number; nextToken?: string | null }): Promise<Result<Favorite[]> & { nextToken?: string | null }> {
    const data = await accountShoppingRequest<{ listCustomerFavorites: { items: (Favorite | null)[]; nextToken?: string | null } }>(`query Favorites($limit: Int, $nextToken: String) { listCustomerFavorites(limit: $limit, nextToken: $nextToken) { items { ${favoriteFields} } nextToken } }`, options);
    return { data: data.listCustomerFavorites.items.filter((item): item is Favorite => item !== null), nextToken: data.listCustomerFavorites.nextToken };
  },
  async get(input: { id: string }): Promise<Result<Favorite | null>> {
    const data = await accountShoppingRequest<{ getCustomerFavorite: Favorite | null }>(`query Favorite($id: ID!) { getCustomerFavorite(id: $id) { ${favoriteFields} } }`, input);
    return { data: data.getCustomerFavorite };
  },
  async create(input: Favorite): Promise<Result<Favorite | null>> {
    const data = await accountShoppingRequest<{ createCustomerFavorite: Favorite | null }>(`mutation CreateFavorite($input: CreateCustomerFavoriteInput!) { createCustomerFavorite(input: $input) { ${favoriteFields} } }`, { input });
    return { data: data.createCustomerFavorite };
  },
  async delete(input: { id: string }): Promise<Result<Favorite | null>> {
    const data = await accountShoppingRequest<{ deleteCustomerFavorite: Favorite | null }>(`mutation DeleteFavorite($input: DeleteCustomerFavoriteInput!) { deleteCustomerFavorite(input: $input) { ${favoriteFields} } }`, { input });
    return { data: data.deleteCustomerFavorite };
  },
};
