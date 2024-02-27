/* eslint-disable @typescript-eslint/no-unused-vars */
import {GraphQLError} from 'graphql';
import catModel from '../models/catModel';
import {Cat, LocationInput, TokenContent} from '../../types/DBTypes';
import {MyContext} from '../../types/MyContext';
import {isAdmin, isLoggedIn} from '../../functions/authorize';

// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object
// note3: updating and deleting resolvers should be the same for users and admins. Use if statements to check if the user is the owner or an admin

export default {
  Query: {
    catById: async (_parent: undefined, args: {id: string}) => {
      return await catModel.findById(args.id);
    },
    cats: async () => {
      return await catModel.find();
    },
    catsByArea: async (_parent: undefined, args: LocationInput) => {
      const rightCorner = [args.topRight.lng, args.topRight.lat];
      const leftCorner = [args.bottomLeft.lng, args.bottomLeft.lat];
      return await catModel.find({
        location: {
          $geoWithin: {
            $box: [rightCorner, leftCorner],
          },
        },
      });
    },
    catsByOwner: async (_parent: undefined, args: {owner: string}) => {
      return await catModel.find({owner: args.owner});
    },
  },
  Mutation: {
    createCat: async (
      _parent: undefined,
      args: {input: Omit<Cat, 'id'>},
      context: MyContext,
    ) => {
      isLoggedIn(context);
      args.input.owner = context.userdata?.user.id;
      return await catModel.create(args.input);
    },
    updateCat: async (
      _parent: undefined,
      args: {id: String; input: Partial<Omit<Cat, 'id'>>},
      context: MyContext,
    ) => {
      isLoggedIn(context);
      if (context.userdata?.user.role === 'admin') {
        return await catModel.findByIdAndUpdate(args.id, args.input, {
          new: true,
        });
      }
      const cat = await catModel.findById(args.id);
      if (context.userdata?.user.id !== cat?.owner.toString()) {
        throw new Error('Not authorized');
      }
      return await catModel.findByIdAndUpdate(args.id, args.input, {
        new: true,
      });
    },
    deleteCat: async (
      _parent: undefined,
      args: {id: String},
      context: MyContext,
    ) => {
      isLoggedIn(context);
      if (context.userdata?.user.role === 'admin') {
        return await catModel.findByIdAndDelete(args.id);
      }
      const filter = {_id: args.id, owner: context.userdata?.user.id};
      return await catModel.findOneAndDelete(filter);
    },
  },
};
