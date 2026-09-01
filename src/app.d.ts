declare global {
	namespace App {
		interface Locals {
			user: {
				id: number;
				email: string;
				name: string;
				phone: string | null;
				is_admin: number;
			} | null;
			cartKey: string;
		}
	}
}

export {};
