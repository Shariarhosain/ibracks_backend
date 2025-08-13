// import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcrypt';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🌱 Starting database seeding...');

//   // Create Users
//   console.log('👤 Creating users...');
  
//   const hashedPassword = await bcrypt.hash('password123', 10);

//   const users = await Promise.all([
//     prisma.user.create({
//       data: {
//         name: 'John Producer',
//         email: 'john@musicapp.com',
//         phoneNumber: '+1234567890',
//         password: hashedPassword,
//         role: 'admin',
//         profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
//         profileImageFilename: 'john-profile.jpg'
//       }
//     }),
//     prisma.user.create({
//       data: {
//         name: 'Sarah Beats',
//         email: 'sarah@musicapp.com',
//         phoneNumber: '+1234567891',
//         password: hashedPassword,
//         role: 'user',
//         profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face',
//         profileImageFilename: 'sarah-profile.jpg'
//       }
//     }),
//     prisma.user.create({
//       data: {
//         name: 'Mike Melody',
//         email: 'mike@musicapp.com',
//         phoneNumber: '+1234567892',
//         password: hashedPassword,
//         role: 'user',
//         profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
//         profileImageFilename: 'mike-profile.jpg'
//       }
//     }),
//     prisma.user.create({
//       data: {
//         name: 'Lisa Harmony',
//         email: 'lisa@musicapp.com',
//         phoneNumber: '+1234567893',
//         password: hashedPassword,
//         role: 'user',
//         profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
//         profileImageFilename: 'lisa-profile.jpg'
//       }
//     }),
//     prisma.user.create({
//       data: {
//         name: 'David Bass',
//         email: 'david@musicapp.com',
//         phoneNumber: '+1234567894',
//         password: hashedPassword,
//         role: 'user',
//         profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
//         profileImageFilename: 'david-profile.jpg'
//       }
//     })
//   ]);

//   console.log(`✅ Created ${users.length} users`);

//   // Create License Packs
//   console.log('📄 Creating license packs...');
  
//   const licensePacks = await Promise.all([
//     prisma.licensePack.create({
//       data: {
//         name: 'Basic License',
//         price: 9.99,
//         description: 'Perfect for personal projects and small content creation',
//         features: [
//           'Personal use only',
//           'Up to 10,000 streams',
//           'YouTube monetization allowed',
//           'No radio broadcasting',
//           'Digital download included'
//         ]
//       }
//     }),
//     prisma.licensePack.create({
//       data: {
//         name: 'Premium License',
//         price: 24.99,
//         description: 'Ideal for commercial projects and professional content',
//         features: [
//           'Commercial use allowed',
//           'Up to 100,000 streams',
//           'Radio broadcasting rights',
//           'TV and film sync rights',
//           'Unlimited YouTube monetization',
//           'Social media promotion rights'
//         ]
//       }
//     }),
//     prisma.licensePack.create({
//       data: {
//         name: 'Exclusive License',
//         price: 99.99,
//         description: 'Full exclusive rights with unlimited usage',
//         features: [
//           'Exclusive ownership',
//           'Unlimited streams and sales',
//           'Full commercial rights',
//           'Radio and TV broadcasting',
//           'Sync rights for film/TV',
//           'Resale rights included',
//           'Master recording rights',
//           'Publishing rights included'
//         ]
//       }
//     }),
//     prisma.licensePack.create({
//       data: {
//         name: 'Student License',
//         price: 4.99,
//         description: 'Special pricing for students and educational use',
//         features: [
//           'Educational use only',
//           'Up to 5,000 streams',
//           'School project rights',
//           'Portfolio showcase allowed',
//           'Non-commercial use only'
//         ]
//       }
//     })
//   ]);

//   console.log(`✅ Created ${licensePacks.length} license packs`);

//   // Create Songs with proper audio and cover mappings
//   console.log('🎵 Creating songs...');
  
//   // Working external audio files from reliable CDNs
//   const audioFiles = [
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
//     'https://commondatastorage.googleapis.com/codeskulptor-assets/Erase_This.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/GalaxyInvaders/theme_01.mp3',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/pyman_assets/intromusic.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/pyman_assets/eatghost.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/start.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/lose.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/menu.ogg',
//     'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp;_BGM_-_09_-_Instantaneous_Schism.mp3'
//   ];

//   // Working external cover images from reliable CDNs
//   const coverFiles = [
//     'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1442504028989-ab58b5f29a4a?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
//     'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'
//   ];

//   const songData = [
//     {
//       title: 'Midnight Dreams',
//       description: 'A smooth R&B track perfect for late night vibes. Features silky vocals and a hypnotic beat that will transport you to another dimension.',
//       musicTag: 'R&B, Chill, Nighttime',
//       pricing: 15.99,
//       duration: '03:24',
//       bpm: 75,
//       status: 'PUBLISHED',
//       playCount: 1250,
//       likeCount: 89,
//       publishedAt: new Date('2024-01-15T10:00:00Z')
//     },
//     {
//       title: 'Electric Pulse',
//       description: 'High-energy EDM banger with electrifying drops and pulsating basslines. Perfect for workout sessions and dance floors.',
//       musicTag: 'EDM, Electronic, Dance',
//       pricing: 22.99,
//       duration: '04:12',
//       bpm: 128,
//       status: 'PUBLISHED',
//       playCount: 2840,
//       likeCount: 156,
//       publishedAt: new Date('2024-01-20T14:30:00Z')
//     },
//     {
//       title: 'Acoustic Sunrise',
//       description: 'Gentle acoustic guitar melodies that capture the beauty of a peaceful morning. Ideal for meditation and relaxation.',
//       musicTag: 'Acoustic, Folk, Peaceful',
//       pricing: 12.99,
//       duration: '02:56',
//       bpm: 90,
//       status: 'PUBLISHED',
//       playCount: 780,
//       likeCount: 67,
//       publishedAt: new Date('2024-02-01T08:00:00Z')
//     },
//     {
//       title: 'Urban Symphony',
//       description: 'A fusion of classical orchestration with modern hip-hop beats. Street sounds meet symphony hall in this unique composition.',
//       musicTag: 'Hip-Hop, Classical, Urban',
//       pricing: 28.99,
//       duration: '05:18',
//       bpm: 95,
//       status: 'PUBLISHED',
//       playCount: 1890,
//       likeCount: 134,
//       publishedAt: new Date('2024-02-10T16:45:00Z')
//     },
//     {
//       title: 'Cosmic Journey',
//       description: 'Ambient space-themed track with ethereal pads and cosmic sound effects. Take a trip through the stars with this atmospheric piece.',
//       musicTag: 'Ambient, Space, Cinematic',
//       pricing: 18.99,
//       duration: '06:42',
//       bpm: 60,
//       status: 'PUBLISHED',
//       playCount: 1120,
//       likeCount: 95,
//       publishedAt: new Date('2024-02-15T12:00:00Z')
//     },
//     {
//       title: 'Funky Groove Machine',
//       description: 'Old-school funk with a modern twist. Slap bass, tight drums, and infectious groove that will get everyone moving.',
//       musicTag: 'Funk, Groove, Retro',
//       pricing: 19.99,
//       duration: '03:38',
//       bpm: 110,
//       status: 'PUBLISHED',
//       playCount: 2150,
//       likeCount: 178,
//       publishedAt: new Date('2024-02-20T11:30:00Z')
//     },
//     {
//       title: 'Digital Rebellion',
//       description: 'Cyberpunk-inspired track with glitchy beats and dystopian atmospheres. Perfect for sci-fi projects and gaming content.',
//       musicTag: 'Cyberpunk, Electronic, Glitch',
//       pricing: 25.99,
//       duration: '04:55',
//       bpm: 140,
//       status: 'SCHEDULED',
//       playCount: 45,
//       likeCount: 8,
//       publishAt: new Date('2024-03-01T10:00:00Z')
//     },
//     {
//       title: 'Summer Breeze',
//       description: 'Light and airy pop track that captures the essence of perfect summer days. Uplifting melodies and feel-good vibes.',
//       musicTag: 'Pop, Summer, Upbeat',
//       pricing: 16.99,
//       duration: '03:15',
//       bpm: 120,
//       status: 'PUBLISHED',
//       playCount: 3200,
//       likeCount: 245,
//       publishedAt: new Date('2024-02-25T15:00:00Z')
//     },
//     {
//       title: 'Jazz Noir',
//       description: 'Moody jazz piece with saxophone leads and noir-inspired harmonies. Perfect for late-night scenes and sophisticated atmospheres.',
//       musicTag: 'Jazz, Noir, Saxophone',
//       pricing: 21.99,
//       duration: '04:28',
//       bpm: 85,
//       status: 'PUBLISHED',
//       playCount: 890,
//       likeCount: 72,
//       publishedAt: new Date('2024-03-05T20:00:00Z')
//     },
//     {
//       title: 'Epic Orchestra',
//       description: 'Cinematic orchestral piece with soaring strings and powerful brass. Ideal for movie trailers and dramatic content.',
//       musicTag: 'Orchestral, Cinematic, Epic',
//       pricing: 35.99,
//       duration: '07:12',
//       bpm: 70,
//       status: 'DRAFT',
//       playCount: 12,
//       likeCount: 3,
//       publishAt: null
//     }
//   ];

//   const songs = [];
//   for (let i = 0; i < songData.length; i++) {
//     const song = await prisma.song.create({
//       data: {
//         ...songData[i],
//         userId: users[i % users.length].id,
//         audioFile: audioFiles[i],
//         audioFilename: `song-${i + 1}.mp3`,
//         coverImage: coverFiles[i],
//         coverImageFilename: `cover-${i + 1}.jpg`
//       }
//     });
//     songs.push(song);
//   }

//   console.log(`✅ Created ${songs.length} songs`);

//   // Create Likes (random likes from users to songs)
//   console.log('❤️ Creating likes...');
  
//   const likes = [];
//   for (let i = 0; i < 50; i++) {
//     const randomUser = users[Math.floor(Math.random() * users.length)];
//     const randomSong = songs[Math.floor(Math.random() * songs.length)];
    
//     try {
//       const like = await prisma.like.create({
//         data: {
//           userId: randomUser.id,
//           songId: randomSong.id
//         }
//       });
//       likes.push(like);
//     } catch (error) {
//       // Skip if like already exists (unique constraint)
//       continue;
//     }
//   }

//   console.log(`✅ Created ${likes.length} likes`);

//   // Create Orders
//   console.log('🛒 Creating orders...');
  
//   const orders = await Promise.all([
//     prisma.order.create({
//       data: {
//         userId: users[1].id,
//         amount: 15.99,
//         status: 'COMPLETED',
//         paymentMethod: 'stripe',
//         transactionId: 'txn_1234567890',
//         metadata: {
//           paymentIntent: 'pi_1234567890',
//           customerEmail: 'sarah@musicapp.com'
//         },
//         items: {
//           create: [
//             {
//               songId: songs[0].id,
//               licenseId: licensePacks[0].id,
//               priceAtTimeOfPurchase: 15.99,
//               licenseDetails: {
//                 licenseName: licensePacks[0].name,
//                 features: licensePacks[0].features
//               }
//             }
//           ]
//         }
//       }
//     }),
//     prisma.order.create({
//       data: {
//         userId: users[2].id,
//         amount: 47.98,
//         status: 'COMPLETED',
//         paymentMethod: 'paypal',
//         transactionId: 'txn_0987654321',
//         metadata: {
//           paypalOrderId: 'PAYPAL123456789',
//           customerEmail: 'mike@musicapp.com'
//         },
//         items: {
//           create: [
//             {
//               songId: songs[1].id,
//               licenseId: licensePacks[1].id,
//               priceAtTimeOfPurchase: 22.99,
//               licenseDetails: {
//                 licenseName: licensePacks[1].name,
//                 features: licensePacks[1].features
//               }
//             },
//             {
//               songId: songs[2].id,
//               licenseId: licensePacks[1].id,
//               priceAtTimeOfPurchase: 24.99,
//               licenseDetails: {
//                 licenseName: licensePacks[1].name,
//                 features: licensePacks[1].features
//               }
//             }
//           ]
//         }
//       }
//     }),
//     prisma.order.create({
//       data: {
//         userId: users[3].id,
//         amount: 99.99,
//         status: 'COMPLETED',
//         paymentMethod: 'stripe',
//         transactionId: 'txn_1122334455',
//         metadata: {
//           paymentIntent: 'pi_1122334455',
//           customerEmail: 'lisa@musicapp.com'
//         },
//         items: {
//           create: [
//             {
//               songId: songs[3].id,
//               licenseId: licensePacks[2].id,
//               priceAtTimeOfPurchase: 99.99,
//               licenseDetails: {
//                 licenseName: licensePacks[2].name,
//                 features: licensePacks[2].features
//               }
//             }
//           ]
//         }
//       }
//     }),
//     prisma.order.create({
//       data: {
//         userId: users[4].id,
//         amount: 4.99,
//         status: 'PENDING',
//         paymentMethod: 'stripe',
//         transactionId: 'txn_5566778899',
//         metadata: {
//           paymentIntent: 'pi_5566778899',
//           customerEmail: 'david@musicapp.com'
//         },
//         items: {
//           create: [
//             {
//               songId: songs[4].id,
//               licenseId: licensePacks[3].id,
//               priceAtTimeOfPurchase: 4.99,
//               licenseDetails: {
//                 licenseName: licensePacks[3].name,
//                 features: licensePacks[3].features
//               }
//             }
//           ]
//         }
//       }
//     }),
//     prisma.order.create({
//       data: {
//         userId: users[1].id,
//         amount: 35.99,
//         status: 'FAILED',
//         paymentMethod: 'stripe',
//         transactionId: 'txn_9988776655',
//         metadata: {
//           paymentIntent: 'pi_9988776655',
//           customerEmail: 'sarah@musicapp.com',
//           failureReason: 'insufficient_funds'
//         },
//         items: {
//           create: [
//             {
//               songId: songs[9].id,
//               licenseId: licensePacks[2].id,
//               priceAtTimeOfPurchase: 35.99,
//               licenseDetails: {
//                 licenseName: licensePacks[2].name,
//                 features: licensePacks[2].features
//               }
//             }
//           ]
//         }
//       }
//     })
//   ]);

//   console.log(`✅ Created ${orders.length} orders`);

//   // Update song like counts based on actual likes
//   console.log('🔄 Updating song like counts...');
  
//   for (const song of songs) {
//     const likeCount = await prisma.like.count({
//       where: { songId: song.id }
//     });
    
//     await prisma.song.update({
//       where: { id: song.id },
//       data: { likeCount }
//     });
//   }

//   console.log('✅ Updated song like counts');

//   console.log('🎉 Database seeding completed successfully!');
//   console.log('\n📊 Seeding Summary:');
//   console.log(`   👤 Users: ${users.length}`);
//   console.log(`   🎵 Songs: ${songs.length}`);
//   console.log(`   📄 License Packs: ${licensePacks.length}`);
//   console.log(`   ❤️ Likes: ${likes.length}`);
//   console.log(`   🛒 Orders: ${orders.length}`);
//   console.log('\n🔐 Default Login Credentials:');
//   console.log('   Email: john@musicapp.com (Admin)');
//   console.log('   Email: sarah@musicapp.com (User)');
//   console.log('   Password: password123');
// }

// main()
//   .catch((e) => {
//     console.error('❌ Error during seeding:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
